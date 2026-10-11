import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MarketplaceSchemaNotice() {
  return (
    <Alert>
      <AlertTitle>Marketplace database setup is required</AlertTitle>
      <AlertDescription>
        The marketplace data tables are not available through this Supabase
        project. Ask the project owner to check the linked project and migration
        history. If the required migrations are already applied, the PostgREST
        schema cache may need to be refreshed. No placeholder data is shown.
      </AlertDescription>
    </Alert>
  );
}
