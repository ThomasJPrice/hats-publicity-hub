import { setArchivedAction } from "@/app/actions";

/** Archive or restore any item. `back` is the internal path to return to. */
export function ArchiveButton({
  entity,
  id,
  archived,
  back,
  className = "btn btn-sm",
}: {
  entity: "task" | "post" | "qr" | "keyDate" | "performance";
  id: string;
  archived: boolean;
  back: string;
  className?: string;
}) {
  return (
    <form action={setArchivedAction}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      <input type="hidden" name="back" value={back} />
      <button className={className}>{archived ? "Restore" : "Archive"}</button>
    </form>
  );
}
