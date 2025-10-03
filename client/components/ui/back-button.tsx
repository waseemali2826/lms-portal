import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BackButton({
  label = "Back",
  fallback = "/",
  variant = "ghost",
  size = "sm",
  className,
}: {
  label?: string;
  fallback?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <Button onClick={goBack} variant={variant} size={size} className={className} aria-label={label}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Back</span>
    </Button>
  );
}
