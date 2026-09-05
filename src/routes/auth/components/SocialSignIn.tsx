import { Button } from '@/components/ui/Button';

const PROVIDERS = ['Google', 'Apple'] as const;

/**
 * Present in the design, inert in this build: there is no identity provider to
 * talk to yet, so the buttons stay disabled rather than pretending to work.
 */
export function SocialSignIn() {
  return (
    <>
      <div className="my-lg gap-md flex items-center">
        <span className="bg-outline-variant h-px flex-1" />
        <span className="font-small text-small text-on-surface-variant uppercase">or</span>
        <span className="bg-outline-variant h-px flex-1" />
      </div>
      <div className="gap-sm flex flex-col">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider}
            variant="secondary"
            fullWidth
            disabled
            title="Social sign-in needs the live API"
          >
            Continue with {provider}
          </Button>
        ))}
      </div>
    </>
  );
}
