from enum import StrEnum


class OrganizationKind(StrEnum):
    STUDENT = "STUDENT"
    CENTRE = "CENTRE"
    COLLEGE = "COLLEGE"


class OrganizationRole(StrEnum):
    OWNER = "OWNER"
    STAFF = "STAFF"
