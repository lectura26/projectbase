export async function GET() {
  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  const content = readFileSync(join(process.cwd(), "public", "llms.txt"), "utf-8");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
