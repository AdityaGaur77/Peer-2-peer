// The Peer 2 Peer mark: two figures, one helping the other. The image is
// public/logo-192.png, cut from the team's logo.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <img
      className="brand-mark"
      src={`${import.meta.env.BASE_URL}logo-192.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="brand">
      <Logo size={size} />
      peer 2 peer
    </span>
  );
}
