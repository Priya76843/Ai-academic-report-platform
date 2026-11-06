import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Note } from "@/components/Note";
import { api, ApiError } from "@/lib/api/client";
import { queries } from "@/lib/api/queries";
import type {
  Asset,
  Project,
  ProjectDetails,
  ReportPlan,
} from "@/lib/api/types";

type Student = {
  name: string;
  usn: string;
};

type DetailsForm = {
  college: string;
  university: string;
  department: string;
  degree: string;
  academic_year: string;
  semester: string;
  students: Student[];
  guide_name: string;
  guide_designation: string;
  hod_name: string;
  principal_name: string;
  instructions: string;
};

type AssetUploadResponse = {
  asset: Asset;
  upload: {
    url: string;
    method: "PUT";
    headers: Record<string, string>;
    expires_at: string;
  };
};

const emptyForm: DetailsForm = {
  college: "",
  university: "",
  department: "",
  degree: "",
  academic_year: "",
  semester: "",
  students: [{ name: "", usn: "" }],
  guide_name: "",
  guide_designation: "",
  hod_name: "",
  principal_name: "",
  instructions: "",
};

const fallbackRequiredDetails = [
  "college",
  "university",
  "department",
  "degree",
  "academic_year",
  "students",
  "guide",
  "hod",
  "principal",
];

function detailsToForm(details?: ProjectDetails): DetailsForm {
  return {
    college: details?.institution?.college ?? "",
    university: details?.institution?.university ?? "",
    department: details?.institution?.department ?? "",
    degree: details?.institution?.degree ?? "",
    academic_year: details?.institution?.academic_year ?? "",
    semester:
      details?.institution?.semester === undefined
        ? ""
        : String(details.institution.semester),
    students: details?.students?.length
      ? details.students.map((student) => ({
          name: student.name ?? "",
          usn: student.usn ?? "",
        }))
      : [{ name: "", usn: "" }],
    guide_name: details?.guide?.name ?? "",
    guide_designation: details?.guide?.designation ?? "",
    hod_name: details?.hod?.name ?? "",
    principal_name: details?.principal?.name ?? "",
    instructions: details?.instructions ?? "",
  };
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formToDetails(form: DetailsForm): ProjectDetails {
  const college = optionalString(form.college);
  const university = optionalString(form.university);
  const department = optionalString(form.department);
  const degree = optionalString(form.degree);
  const academicYear = optionalString(form.academic_year);
  const semesterText = optionalString(form.semester);
  const semester = semesterText ? Number(semesterText) : undefined;

  const institution = {
    ...(college ? { college } : {}),
    ...(university ? { university } : {}),
    ...(department ? { department } : {}),
    ...(degree ? { degree } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(semesterText && Number.isFinite(semester)
      ? { semester }
      : {}),
  };

  const students = form.students
    .filter(
      (student) =>
        student.name.trim().length > 0 ||
        student.usn.trim().length > 0,
    )
    .map((student) => ({
      name: student.name,
      // Preserve the entered USN exactly.
      usn: student.usn,
    }));

  const guideName = optionalString(form.guide_name);
  const guideDesignation = optionalString(form.guide_designation);
  const hodName = optionalString(form.hod_name);
  const principalName = optionalString(form.principal_name);
  const instructions = optionalString(form.instructions);

  return {
    ...(Object.keys(institution).length > 0
      ? { institution }
      : {}),
    ...(students.length > 0 ? { students } : {}),
    ...(guideName
  ? {
      guide: {
        name: guideName,
        ...(guideDesignation ? { designation: guideDesignation } : {}),
      },
    }
  : {}),
    ...(hodName ? { hod: { name: hodName } } : {}),
    ...(principalName
      ? { principal: { name: principalName } }
      : {}),
    ...(instructions ? { instructions } : {}),
  };
}

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        Object.values(item).some(
          (field) =>
            typeof field === "string" && field.trim().length > 0,
        ),
    );
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getDetailValue(key: string, form: DetailsForm): unknown {
  const values: Record<string, unknown> = {
    college: form.college,
    university: form.university,
    department: form.department,
    degree: form.degree,
    academic_year: form.academic_year,
    semester: form.semester,
    students: form.students,
    guide: form.guide_name,
    guide_name: form.guide_name,
    hod: form.hod_name,
    hod_name: form.hod_name,
    principal: form.principal_name,
    principal_name: form.principal_name,
  };

  return values[key];
}

function getRequiredDetails(plan: ReportPlan | undefined): string[] {
  const fromPlan =
    plan?.front_matter.flatMap(
      (item) => item.required_details ?? [],
    ) ?? [];

  return [
    ...new Set(
      fromPlan.length ? fromPlan : fallbackRequiredDetails,
    ),
  ];
}

function getLogoErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "IMAGE_TOO_SMALL":
        return "Logo image is too small. Please upload an image with dimensions of at least 300 × 300 pixels.";

      case "UNSUPPORTED_TYPE":
        return "Unsupported logo format. Please upload a PNG or JPG image.";

      case "OBJECT_NOT_FOUND":
        return "The uploaded logo could not be found. Please try uploading it again.";

      default:
        return error.message || "Unable to upload logo.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to upload logo. Please try again.";
}

function uploadFile(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);

    Object.entries(headers).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(
          Math.round((event.loaded / event.total) * 100),
        );
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(
          new Error(`Logo upload failed (${request.status}).`),
        );
      }
    };

    request.onerror = () => {
      reject(
        new Error("Logo upload failed. Check your connection."),
      );
    };

    request.onabort = () => {
      reject(new Error("Logo upload was cancelled."));
    };

    request.send(file);
  });
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft aria-[invalid=true]:border-err"
      />

      {error && (
        <span className="mt-1 block text-xs text-err">
          {error}
        </span>
      )}
    </label>
  );
}

export function ReportDetailsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectQuery = useQuery({
    ...queries.project(projectId),
    enabled: Boolean(projectId),
  });

  const planQuery = useQuery({
    ...queries.plan(projectId),
    enabled: Boolean(projectId),
  });

  const project = projectQuery.data;
  const plan = planQuery.data;

  const [form, setForm] = useState<DetailsForm>(emptyForm);
  const [formLoaded, setFormLoaded] = useState(false);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!project || formLoaded) return;

    setForm(detailsToForm(project.details));
    setLogoAssetId(project.logo_asset_id ?? null);
    setFormLoaded(true);
  }, [project, formLoaded]);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const requiredDetails = useMemo(
    () => getRequiredDetails(plan),
    [plan],
  );

  const missingDetails = useMemo(
    () =>
      requiredDetails.filter(
        (key) => !isFilled(getDetailValue(key, form)),
      ),
    [requiredDetails, form],
  );

  const markUnsaved = () => {
    setSaved(false);
  };

  const updateField = (key: keyof DetailsForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    markUnsaved();

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const updateStudent = (
    index: number,
    key: keyof Student,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      students: current.students.map((student, studentIndex) =>
        studentIndex === index
          ? { ...student, [key]: value }
          : student,
      ),
    }));

    markUnsaved();
  };

  const addStudent = () => {
    setForm((current) => ({
      ...current,
      students: [
        ...current.students,
        { name: "", usn: "" },
      ],
    }));

    markUnsaved();
  };

  const removeStudent = (index: number) => {
    setForm((current) => ({
      ...current,
      students: current.students.filter(
        (_, studentIndex) => studentIndex !== index,
      ),
    }));

    markUnsaved();
  };

  const saveMutation = useMutation({
    mutationFn: (details: ProjectDetails) =>
      api<Project>(`/projects/${projectId}`, {
        method: "PATCH",
        body: { details },
      }),

    onSuccess: async (updatedProject) => {
      queryClient.setQueryData(
        ["project", projectId],
        updatedProject,
      );

      await queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });

      setSaveError("");
      setFieldErrors({});
      setSaved(true);
    },

    onError: (error: Error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
      }

      setSaveError(
        error.message || "Unable to save report details.",
      );
    },
  });

  const handleSave = async () => {
    setSaveError("");
    setSaved(false);

    await saveMutation.mutateAsync(formToDetails(form));
  };

  const handleContinue = async () => {
    try {
      await handleSave();
      navigate(`/projects/${projectId}/sources`);
    } catch {
      // The mutation displays the save error.
    }
  };

  const handleLogoSelection = async (file?: File) => {
    if (!file || uploading) return;

    setLogoError("");
    setUploadProgress(0);

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError(
        "Unsupported logo format. Please upload a PNG or JPG image.",
      );
      return;
    }

    markUnsaved();

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = async () => {
      if (image.width < 300 || image.height < 300) {
        URL.revokeObjectURL(previewUrl);
        setLogoError(
          "Logo must be at least 300 × 300 pixels.",
        );
        return;
      }

      setLogoPreview(previewUrl);
      setUploading(true);

      // Do not display the previous logo as the newly uploaded one.
      setLogoAssetId(null);

      try {
        const response = await api<AssetUploadResponse>(
          `/projects/${projectId}/assets`,
          {
            method: "POST",
            body: {
              asset_type: "LOGO",
              filename: file.name,
              mime_type: file.type,
              size_bytes: file.size,
            },
          },
        );

        if (response.upload.method !== "PUT") {
          throw new Error(
            "The server returned an unsupported upload method.",
          );
        }

        await uploadFile(
          response.upload.url,
          response.upload.headers,
          file,
          setUploadProgress,
        );

        const completedAsset = await api<Asset>(
          `/projects/${projectId}/assets/${response.asset.id}/complete`,
          { method: "POST" },
        );

        // Upload completion does not attach the logo to the project.
        // The project association requires the confirmed backend contract.
        setLogoAssetId(completedAsset.id);
        setLogoError("");
      } catch (error) {
        setLogoAssetId(null);
        setLogoError(getLogoErrorMessage(error));
      } finally {
        setUploading(false);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setLogoError(
        "Unable to read this image. Please choose another file.",
      );
    };

    image.src = previewUrl;
  };

  if (projectQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-ink-2">
        Loading report details...
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <div className="p-8">
        <Note tone="err">
          Unable to load this project. Please refresh and try again.
        </Note>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-accent">
          Setup · Step 1
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Report details
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-2">
          Add your institution, student, and guide details. These
          details are used on the report's front pages and can be
          changed before export.
        </p>
      </div>

      {saved && (
        <Note tone="ok">
          Saved. These details fill the front pages. Change them any
          time before export.
        </Note>
      )}

      {missingDetails.length > 0 && (
        <Note tone="warn">
          {missingDetails.length} detail
          {missingDetails.length === 1 ? "" : "s"} missing for the
          front pages. You can continue; the cover page and
          certificate will show blanks until you fill them.
        </Note>
      )}

      {saveError && <Note tone="err">{saveError}</Note>}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-ink">
            Institution details
          </h2>

          <p className="mt-1 text-sm text-ink-3">
            Enter the official institution details that should appear
            in the report.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="College name"
            value={form.college}
            onChange={(v) => updateField("college", v)}
            error={fieldErrors["details.institution.college"]}
          />

          <Field
            label="University"
            value={form.university}
            onChange={(v) => updateField("university", v)}
          />

          <Field
            label="Department"
            value={form.department}
            onChange={(v) => updateField("department", v)}
          />

          <Field
            label="Degree"
            value={form.degree}
            onChange={(v) => updateField("degree", v)}
          />

          <Field
            label="Academic year"
            value={form.academic_year}
            onChange={(v) => updateField("academic_year", v)}
            placeholder="2026–2027"
          />

          <Field
            label="Semester"
            value={form.semester}
            onChange={(v) => updateField("semester", v)}
            type="number"
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Student details
            </h2>

            <p className="mt-1 text-sm text-ink-3">
              Add every student whose name and USN should appear in
              the report.
            </p>
          </div>

          <button
            type="button"
            onClick={addStudent}
            className="rounded-lg border border-accent-soft px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            + Add student
          </button>
        </div>

        <div className="space-y-4">
          {form.students.map((student, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Field
                label={`Student ${index + 1} name`}
                value={student.name}
                onChange={(value) =>
                  updateStudent(index, "name", value)
                }
              />

              <Field
                label="USN"
                value={student.usn}
                onChange={(value) =>
                  updateStudent(index, "usn", value)
                }
                placeholder="Enter USN exactly as issued"
              />

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={form.students.length === 1}
                  onClick={() => removeStudent(index)}
                  className="rounded-lg px-3 py-2.5 text-sm text-err hover:bg-err-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">
          Guide and signatories
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Guide name"
            value={form.guide_name}
            onChange={(v) => updateField("guide_name", v)}
          />

          <Field
            label="Guide designation"
            value={form.guide_designation}
            onChange={(v) =>
              updateField("guide_designation", v)
            }
          />

          <Field
            label="Head of Department (HOD)"
            value={form.hod_name}
            onChange={(v) => updateField("hod_name", v)}
          />

          <Field
            label="Principal name"
            value={form.principal_name}
            onChange={(v) =>
              updateField("principal_name", v)
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          College logo
        </h2>

        <p className="mt-1 text-sm text-ink-3">
          Upload a PNG or JPG image with dimensions of at least
          300 × 300 pixels. The logo can appear on the cover page
          and certificate.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => {
            void handleLogoSelection(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="College logo preview"
              className="h-24 w-24 rounded-lg border border-line object-contain p-2"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-3">
              No logo
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Choose logo"}
            </button>

            {uploading && (
              <div className="w-56">
                <div className="mb-1 flex justify-between text-xs text-ink-3">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>

                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-3"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {logoAssetId && (
          <p className="mt-3 text-xs text-ok">
            Logo uploaded successfully.
          </p>
        )}

        {logoError && (
          <p className="mt-3 text-sm text-err">
            {logoError}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          Instructions for writer
        </h2>

        <p className="mt-1 text-sm text-ink-3">
          These instructions guide chapter writing. They are not
          printed as report content.
        </p>

        <textarea
          value={form.instructions}
          onChange={(event) =>
            updateField("instructions", event.target.value)
          }
          rows={5}
          placeholder="Add writing preferences, formatting notes, or other instructions..."
          className="mt-4 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </section>

      {planQuery.isError &&
        !(
          planQuery.error instanceof ApiError &&
          planQuery.error.status === 404
        ) && (
          <Note tone="info">
            The report plan could not be loaded. The standard
            front-page required details are being used for the
            missing-details reminder.
          </Note>
        )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() =>
            navigate(`/projects/${projectId}/sources`)
          }
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
        >
          Skip for now
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={saveMutation.isPending || uploading}
            onClick={() => {
              void handleSave().catch(() => undefined);
            }}
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending || uploading}
            onClick={() => void handleContinue()}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Continue to sources
          </button>
        </div>
      </div>
    </div>
  );
}
