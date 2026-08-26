import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Card } from "@/components/ui/card";
import { EMPTY_STATE_MESSAGES } from "@/constants/messages";

interface EmptyMasterWorkspaceProps {
  readonly caption: string;
  readonly columns: readonly string[];
  readonly emptyDescription: string;
}

/**
 * Shared empty master list. New ERP modules land here until their schema and
 * services exist, so navigation, permission gates and layout already work.
 */
export function EmptyMasterWorkspace({
  caption,
  columns,
  emptyDescription,
}: EmptyMasterWorkspaceProps) {
  const tableColumns: DataTableColumn<{ readonly id: string }>[] = columns.map((header) => ({
    id: header.toLowerCase().replace(/\s+/g, "-"),
    header,
    cell: () => null,
  }));

  return (
    <Card>
      <DataTable
        columns={tableColumns}
        rows={[]}
        getRowId={(row) => row.id}
        caption={caption}
        emptyState={
          <EmptyState title={EMPTY_STATE_MESSAGES.NO_RECORDS} description={emptyDescription} />
        }
      />
    </Card>
  );
}
