import { LoadingState } from "@/components/states/loading-state";

export default function TrainerLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <LoadingState label="Loading training provider workspace" />
    </div>
  );
}
