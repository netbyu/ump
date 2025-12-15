"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Info,
  Play,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface StepApprovalInterfaceProps {
  step: {
    step_id: string;
    step_name: string;
    deployment_mode: string;
    preview_data?: any;
    impact_analysis?: any;
  };
  onApprove: (data?: any) => void;
  onReject: (reason: string) => void;
}

export function StepApprovalInterface({
  step,
  onApprove,
  onReject,
}: StepApprovalInterfaceProps) {
  const [confirmationChecks, setConfirmationChecks] = useState<Record<string, boolean>>({});
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const preview = step.preview_data;
  const impact = step.impact_analysis;
  const requiresTypedConfirmation = impact?.require_typed_confirmation || false;

  const allChecksComplete = () => {
    const requiredChecks = impact?.required_checks || [];
    if (requiredChecks.length === 0) return true;
    return requiredChecks.every((check: string) => confirmationChecks[check]);
  };

  const typedConfirmationValid = () => {
    if (!requiresTypedConfirmation) return true;
    return typedConfirmation === impact?.confirmation_text;
  };

  const canApprove = allChecksComplete() && typedConfirmationValid();

  return (
    <div className="space-y-4 mt-4">
      {/* Operation Preview */}
      {preview && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Operation Preview
              </p>

              {/* Operation Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground min-w-[100px]">Action:</span>
                  <Badge variant="outline" className="font-mono">
                    {preview.operation}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground min-w-[100px]">Target:</span>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {preview.target}
                  </code>
                </div>

                {preview.environment && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-[100px]">Environment:</span>
                    <Badge
                      variant={preview.environment === "PRODUCTION" ? "destructive" : "default"}
                    >
                      {preview.environment}
                    </Badge>
                  </div>
                )}

                {preview.record_count && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-[100px]">Records:</span>
                    <span className="font-medium">{preview.record_count}</span>
                  </div>
                )}
              </div>

              {/* Data Changes */}
              {preview.changes && preview.changes.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold mb-2">Changes:</p>
                  <div className="bg-white dark:bg-gray-900 p-3 rounded border space-y-1 font-mono text-xs">
                    {preview.changes.map((change: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[120px]">
                          {change.field}:
                        </span>
                        <span className="line-through text-red-600 dark:text-red-400">
                          {JSON.stringify(change.old_value)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {JSON.stringify(change.new_value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Record Data (for creates) */}
              {preview.record_data && (
                <div className="mt-3">
                  <p className="text-sm font-semibold mb-2">Record Data:</p>
                  <div className="bg-white dark:bg-gray-900 p-3 rounded border space-y-1 font-mono text-xs">
                    {Object.entries(preview.record_data).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[120px]">{key}:</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Details (for payments) */}
              {preview.transaction_details && (
                <div className="mt-3">
                  <p className="text-sm font-semibold mb-2">Transaction Details:</p>
                  <div className="bg-white dark:bg-gray-900 p-3 rounded border space-y-1 text-sm">
                    {Object.entries(preview.transaction_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Impact Analysis */}
      {impact && impact.warnings && impact.warnings.length > 0 && (
        <div
          className={`p-4 rounded-lg border ${
            impact.risk_level === "critical"
              ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
              : impact.risk_level === "high"
              ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800"
              : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                impact.risk_level === "critical"
                  ? "text-red-600"
                  : impact.risk_level === "high"
                  ? "text-orange-600"
                  : "text-yellow-600"
              }`}
            />
            <div className="flex-1">
              <p className="font-semibold mb-2">
                {impact.risk_level === "critical" ? "🚨 CRITICAL OPERATION" : "Impact Analysis"}
              </p>
              <ul className="text-sm space-y-1">
                {impact.warnings.map((warning: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Checkboxes */}
      {impact?.required_checks && impact.required_checks.length > 0 && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
          <p className="text-sm font-semibold">Confirmation Required:</p>
          {impact.required_checks.map((check: string, index: number) => (
            <div key={index} className="flex items-start gap-3">
              <Checkbox
                id={`check-${index}`}
                checked={confirmationChecks[check] || false}
                onCheckedChange={(checked) =>
                  setConfirmationChecks({
                    ...confirmationChecks,
                    [check]: checked as boolean,
                  })
                }
                className="mt-1"
              />
              <Label
                htmlFor={`check-${index}`}
                className="text-sm cursor-pointer leading-relaxed"
              >
                {check}
              </Label>
            </div>
          ))}
        </div>
      )}

      {/* Typed Confirmation (for critical ops) */}
      {requiresTypedConfirmation && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Type "{impact.confirmation_text}" to confirm:
          </Label>
          <Input
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            placeholder={impact.confirmation_text}
            className={`font-mono ${
              typedConfirmation && !typedConfirmationValid()
                ? "border-red-500 dark:border-red-600"
                : typedConfirmationValid()
                ? "border-green-500 dark:border-green-600"
                : ""
            }`}
          />
          {typedConfirmation && !typedConfirmationValid() && (
            <p className="text-xs text-red-600">
              Text doesn't match. Type exactly: {impact.confirmation_text}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!showReject ? (
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => onApprove()}
            disabled={!canApprove}
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Approve & Continue
          </Button>
          <Button
            onClick={() => setShowReject(true)}
            variant="outline"
            size="lg"
            className="border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <XCircle className="mr-2 h-5 w-5" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-semibold">Reason for Rejection:</Label>
          <Textarea
            placeholder="Explain why this step is being rejected..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (rejectionReason.trim()) {
                  onReject(rejectionReason);
                  setShowReject(false);
                }
              }}
              variant="destructive"
              disabled={!rejectionReason.trim()}
              size="lg"
              className="flex-1"
            >
              Confirm Rejection
            </Button>
            <Button
              onClick={() => setShowReject(false)}
              variant="outline"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Approval Status */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center justify-between">
          <span>
            Mode: {step.deployment_mode} • Impact: {impact?.impact_level || "unknown"}
          </span>
          {!canApprove && (
            <span className="text-yellow-600">
              Complete all confirmations to approve
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
