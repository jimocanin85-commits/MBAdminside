import { Link } from "react-router-dom";
import { PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <>
    <PageHeader eyebrow="Fejl 404" title="Siden findes ikke" />
    <PageBody>
      <Panel>
        <p className="mb-4 text-muted-foreground">
          Adressen passer ikke til en side i portalen. Den kan være flyttet, eller sektionen kan være slået fra.
        </p>
        <Button asChild size="lg">
          <Link to="/">Til forsiden</Link>
        </Button>
      </Panel>
    </PageBody>
  </>
);

export default NotFound;
