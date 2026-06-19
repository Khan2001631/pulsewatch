import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Monitor, HTTPMethod } from "@/types/monitor";

// Schema matching backend model fields & validation rules
const monitorSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  url: z
    .string()
    .min(1, "URL is required")
    .url("Must be a valid HTTP or HTTPS URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"] as const),
  expected_status_code: z.coerce
    .number()
    .int("Must be an integer")
    .min(100, "Expected status code must be at least 100")
    .max(599, "Expected status code must be at most 599"),
  check_interval_seconds: z.coerce
    .number()
    .int("Must be an integer")
    .min(1, "Interval must be greater than zero"),
  is_active: z.boolean(),
});

type MonitorFormValues = z.infer<typeof monitorSchema>;

interface MonitorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: MonitorFormValues) => Promise<void>;
  initialData?: Monitor | null;
  title: string;
  isLoading?: boolean;
}

export function MonitorForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  isLoading = false,
}: MonitorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      name: "",
      url: "",
      method: "GET",
      expected_status_code: 200,
      check_interval_seconds: 60,
      is_active: true,
    },
  });

  // Reset values when initialData or modal status changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          url: initialData.url,
          method: initialData.method,
          expected_status_code: initialData.expected_status_code,
          check_interval_seconds: initialData.check_interval_seconds,
          is_active: initialData.is_active,
        });
      } else {
        reset({
          name: "",
          url: "",
          method: "GET",
          expected_status_code: 200,
          check_interval_seconds: 60,
          is_active: true,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1527] p-6 shadow-2xl animate-fade-in z-10">
        {/* Glow effect in background */}
        <div className="absolute -right-24 -top-24 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)" }} />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-300">Monitor Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Production API"
              className="bg-[#090f1d] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs font-medium text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* URL Field */}
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-xs font-semibold text-slate-300">Endpoint URL</Label>
            <Input
              id="url"
              type="text"
              placeholder="e.g. https://api.example.com/health"
              className="bg-[#090f1d] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
              {...register("url")}
            />
            {errors.url && (
              <p className="text-xs font-medium text-red-400">{errors.url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Method Field */}
            <div className="space-y-1.5">
              <Label htmlFor="method" className="text-xs font-semibold text-slate-300">HTTP Method</Label>
              <select
                id="method"
                className="flex h-10 w-full rounded-md border border-white/10 bg-[#090f1d] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                {...register("method")}
              >
                <option value="GET" className="bg-[#0d1527]">GET</option>
                <option value="POST" className="bg-[#0d1527]">POST</option>
                <option value="PUT" className="bg-[#0d1527]">PUT</option>
                <option value="PATCH" className="bg-[#0d1527]">PATCH</option>
                <option value="DELETE" className="bg-[#0d1527]">DELETE</option>
              </select>
              {errors.method && (
                <p className="text-xs font-medium text-red-400">{errors.method.message}</p>
              )}
            </div>

            {/* Expected Status Code Field */}
            <div className="space-y-1.5">
              <Label htmlFor="expected_status_code" className="text-xs font-semibold text-slate-300">Expected Status</Label>
              <Input
                id="expected_status_code"
                type="number"
                placeholder="200"
                className="bg-[#090f1d] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                {...register("expected_status_code")}
              />
              {errors.expected_status_code && (
                <p className="text-xs font-medium text-red-400">{errors.expected_status_code.message}</p>
              )}
            </div>
          </div>

          {/* Check Interval Field */}
          <div className="space-y-1.5">
            <Label htmlFor="check_interval_seconds" className="text-xs font-semibold text-slate-300">Check Interval (seconds)</Label>
            <Input
              id="check_interval_seconds"
              type="number"
              placeholder="60"
              className="bg-[#090f1d] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
              {...register("check_interval_seconds")}
            />
            {errors.check_interval_seconds && (
              <p className="text-xs font-medium text-red-400">{errors.check_interval_seconds.message}</p>
            )}
          </div>

          {/* Toggle Active Status */}
          <div className="flex items-center gap-3 pt-2">
            <input
              id="is_active"
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-[#090f1d] text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 focus:ring-2 accent-blue-500"
              {...register("is_active")}
            />
            <Label htmlFor="is_active" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Active Monitoring (Run health checks)
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20"
            >
              {isLoading ? "Saving..." : "Save Monitor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
