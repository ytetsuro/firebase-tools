import { Command } from "../command";
import { datetimeString } from "../utils";
import { FirebaseError } from "../error";
import { logger } from "../logger";
import { needProjectId } from "../projectUtils";
import { Options } from "../options";
import * as apphosting from "../gcp/apphosting";

const Table = require("cli-table");
const TABLE_HEAD = ["Backend", "Repository", "URL", "Location", "Updated Date"];

export const command = new Command("apphosting:backends:list")
  .description("list Firebase App Hosting backends")
  .option("-l, --location <location>", "list backends in the specified location", "-")
  .before(apphosting.ensureApiEnabled)
  .action(async (options: Options) => {
    const projectId = needProjectId(options);
    const location = options.location as string;
    let backendRes: apphosting.ListBackendsResponse;
    try {
      backendRes = await apphosting.listBackends(projectId, location);
    } catch (err: unknown) {
      throw new FirebaseError(
        `Unable to list backends present for project: ${projectId}. Please check the parameters you have provided.`,
        { original: err as Error },
      );
    }

    const backends = backendRes.backends ?? [];
    printBackendsTable(backends);

    return backends;
  });

/**
 * Prints a table given a list of backends
 */
export function printBackendsTable(backends: apphosting.Backend[]): void {
  const table = new Table({
    head: TABLE_HEAD,
    style: { head: ["green"] },
  });

  for (const backend of backends) {
    // sample backend.name value: "projects/<project-name>/locations/us-central1/backends/<backend-id>"
    const [backendLocation, , backendId] = backend.name.split("/").slice(3, 6);
    table.push([
      backendId,
      // sample repository value: "projects/<project-name>/locations/us-central1/connections/<connection-id>/repositories/<repository-name>"
      backend.codebase?.repository?.split("/").pop() ?? "",
      backend.uri.startsWith("https:") ? backend.uri : "https://" + backend.uri,
      backendLocation,
      datetimeString(new Date(backend.updateTime)),
    ]);
  }
  logger.info(table.toString());
}
