import { RoflClient } from "@oasisprotocol/rofl-client";

const client = new RoflClient();

export async function getAppId(): Promise<string> {
  return client.getAppId();
}
