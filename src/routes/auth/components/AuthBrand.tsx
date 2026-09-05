interface AuthBrandProps {
  tagline: string;
}

/** The wordmark anchor that sits above every auth canvas. */
export function AuthBrand({ tagline }: AuthBrandProps) {
  return (
    <div className="mb-xl text-center">
      <h1 className="font-display text-display text-primary-container mb-sm">Yello</h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{tagline}</p>
    </div>
  );
}
