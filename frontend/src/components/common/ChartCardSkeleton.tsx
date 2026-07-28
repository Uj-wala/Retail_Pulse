import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

/** Loading placeholder matching the shape of a titled chart Card (used across chart widgets). */
export function ChartCardSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}
