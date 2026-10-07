import { useQueryClient } from "@tanstack/react-query";
import { CloudFiles } from "@/components/dashboard/CloudFiles";
import { PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";

/** Every volunteer's spreadsheet, shared between all users. */
const Filer = () => {
  const queryClient = useQueryClient();

  return (
    <>
      <PageHeader eyebrow="Frivilliges regneark" title="Filer" />
      <PageBody>
        <Panel>
          <CloudFiles
            onTrainerDeleted={() => {
              // Keep the front page's "Seneste frivillige" in step.
              queryClient.invalidateQueries({ queryKey: ["volunteer-files"] });
            }}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default Filer;
