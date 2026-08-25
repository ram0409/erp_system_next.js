import { PageContainer } from "@/components/layout/page-container";
import { LoadingState } from "@/components/shared/loading-state";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <PageContainer>
      <Card>
        <LoadingState />
      </Card>
    </PageContainer>
  );
}
