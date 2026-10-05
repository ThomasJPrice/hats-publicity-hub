/** `archived: true | false` on an update becomes an archived_at value; undefined leaves it untouched. */
export function archivePatch(archived: boolean | undefined): { archivedAt?: Date | null } {
  return archived === undefined ? {} : { archivedAt: archived ? new Date() : null };
}

export function changeSummary(verb: string, entity: string, title: string, input: Record<string, unknown>): string {
  if (Object.keys(input).length === 1 && typeof input.archived === "boolean") {
    return `${input.archived ? "Archived" : "Restored"} ${entity}: ${title}`;
  }
  return `${verb} ${entity}: ${title} (${Object.keys(input).join(", ")})`;
}
