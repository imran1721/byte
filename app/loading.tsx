// Streaming boundary: lets the layout (and the Splash overlay) paint
// immediately while the feed's server fetch is still running, instead of
// blocking the whole HTML response. Just a black backdrop under the splash.
export default function Loading() {
  return <div className="h-[100dvh] bg-[#0a0a0a]" />;
}
