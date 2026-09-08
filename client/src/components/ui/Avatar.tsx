import { initials } from "@/lib/format";
import type { User } from "@/lib/types";

/** Profile picture with initials fallback. */
export function Avatar({
  user,
  size = "md",
}: {
  user: Pick<User, "fullName" | "profilePic">;
  size?: "sm" | "md" | "lg";
}) {
  const dimension =
    size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-7 w-7 text-[0.625rem]" : "h-9 w-9 text-xs";

  if (user.profilePic) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URL
      <img
        src={user.profilePic}
        alt={user.fullName}
        className={`${dimension} shrink-0 rounded-full border border-base-300 object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimension} flex shrink-0 select-none items-center justify-center rounded-full bg-secondary font-semibold uppercase tracking-wide text-secondary-content`}
    >
      {initials(user.fullName)}
    </span>
  );
}