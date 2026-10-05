import { londonToday, weekRange } from "@/lib/dates";
import { daysToOpeningNight, nextKeyDates } from "@/lib/show";
import { bucketTasks } from "@/lib/task-buckets";
import { listPostsInRange } from "./posts";
import { getQrOverview } from "./qr";
import { listTasks } from "./tasks";

export async function getStatusSummary(today = londonToday()) {
  const thisWeek = weekRange(today, 0);
  const nextWeek = weekRange(today, 1);
  const [open, postsThisWeek, qr] = await Promise.all([
    listTasks({ status: "open" }, today),
    listPostsInRange(thisWeek),
    getQrOverview(7, today),
  ]);
  const buckets = bucketTasks(open, today);
  return {
    today,
    thisWeekRange: thisWeek,
    nextWeekRange: nextWeek,
    daysToOpeningNight: daysToOpeningNight(today),
    ...buckets,
    postsThisWeek,
    nextKeyDates: nextKeyDates(today, 3),
    topQrLinks: qr.links
      .filter((l) => l.last7Days > 0)
      .sort((a, b) => b.last7Days - a.last7Days)
      .slice(0, 5)
      .map((l) => ({ slug: l.slug, label: l.label, scansLast7Days: l.last7Days, totalScans: l.totalScans })),
  };
}
