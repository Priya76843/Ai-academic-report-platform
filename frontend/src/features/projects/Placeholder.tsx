import { useParams } from "react-router-dom";
import { Note } from "@/components/Note";

export function Placeholder({ screen, ticket }: { screen: string; ticket: string }) {
  const { projectId } = useParams();
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="text-xl font-semibold tracking-tight">{screen}</h1>
      <Note>Built in ticket {ticket}. Project {projectId ?? "—"}. See the Slice One Walkthrough for every state this screen must show.</Note>
    </div>
  );
}
