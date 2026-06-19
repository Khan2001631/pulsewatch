import { useEffect } from "react";
import { useGetMeQuery } from "@/services/authApi";
import { useAppDispatch } from "@/hooks/redux";
import { setAuthLoading } from "@/features/auth/authSlice";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isLoading, isUninitialized } = useGetMeQuery(undefined, {
    // Only fetch once on mount to restore session
    refetchOnMountOrArgChange: false,
  });

  useEffect(() => {
    // If the query finishes loading, we update the global auth loading state
    if (!isLoading && !isUninitialized) {
      dispatch(setAuthLoading(false));
    }
  }, [isLoading, isUninitialized, dispatch]);

  if (isLoading || isUninitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Initializing PulseWatch...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
