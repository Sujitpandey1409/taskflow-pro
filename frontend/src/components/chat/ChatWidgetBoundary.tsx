"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatWidgetBoundaryProps = {
  children: ReactNode;
};

type ChatWidgetBoundaryState = {
  hasError: boolean;
};

export default class ChatWidgetBoundary extends Component<
  ChatWidgetBoundaryProps,
  ChatWidgetBoundaryState
> {
  state: ChatWidgetBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chat widget failed to render", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-4 right-4 z-[2147483000] sm:bottom-5 sm:right-5">
          <div className="w-[min(calc(100vw-1rem),24rem)] rounded-3xl border border-rose-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Team chat is temporarily unavailable</p>
                <p className="mt-1 text-sm text-slate-600">
                  The rest of the dashboard is still safe. You can reload just the chat widget here.
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={() => this.setState({ hasError: false })}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry chat
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
