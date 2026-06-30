import Feed from "@/components/Feed";
import { getFeedPage } from "@/lib/feed";

// Revalidate the whole page every 30 minutes; sources are cached too.
export const revalidate = 1800;

export default async function Home() {
  const items = await getFeedPage(0); // first page; the client fetches more
  return <Feed items={items} />;
}
