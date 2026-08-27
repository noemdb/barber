import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { requireRole } from "@/lib/permissions";

const uploadthing = createUploadthing();
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/svg+xml"]);

export const ourFileRouter = {
  avatarUploader: uploadthing({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      await requireRole("ADMIN", "OWNER");
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      if (!allowedImageTypes.has(file.type)) {
        await new UTApi().deleteFiles(file.key);
        throw new Error("Solo se permiten imágenes PNG, JPG, GIF o SVG");
      }

      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
