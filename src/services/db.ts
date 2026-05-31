/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimalRecord } from "../types";

const DB_NAME = "AnimalRecognitionDB";
const DB_VERSION = 1;
const STORE_IMAGES = "images";

export interface DBImageEntry {
  id: string;
  originalBlob: Blob;
  thumbnailUrl: string; // uniform thumbnail in base64/objectUrl
  metadata: AnimalRecord;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
      }
    };
  });
}

/**
 * Saves an original image Blob, uniform thumbnail, and its classification metadata
 */
export async function saveImageRecord(
  record: AnimalRecord,
  originalBlob: Blob
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const store = transaction.objectStore(STORE_IMAGES);

    const entry: DBImageEntry = {
      id: record.id,
      originalBlob,
      thumbnailUrl: record.thumbnailUrl,
      metadata: record,
    };

    const request = store.put(entry);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to store image record: ${record.id}`));
    };
  });
}

/**
 * Retrieves all items stored in IndexedDB (fast caching engine)
 */
export async function getAllImageRecords(): Promise<DBImageEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readonly");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.getAll();

    request.onsuccess = (event: any) => {
      resolve(event.target.result || []);
    };

    request.onerror = () => {
      reject(new Error("Failed to fetch image records from local database Cache"));
    };
  });
}

/**
 * Retrieves a single image entry including original Blob
 */
export async function getImageRecord(id: string): Promise<DBImageEntry | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readonly");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.get(id);

    request.onsuccess = (event: any) => {
      resolve(event.target.result || null);
    };

    request.onerror = () => {
      reject(new Error(`Failed to fetch record for id ${id}`));
    };
  });
}

/**
 * Updates only the metadata portion of an existing image record
 */
export async function updateImageRecordMetadata(
  record: AnimalRecord
): Promise<void> {
  const db = await initDB();
  const existing = await getImageRecord(record.id);
  if (!existing) {
    throw new Error(`Cannot update metadata: record ${record.id} not found.`);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const store = transaction.objectStore(STORE_IMAGES);

    const updatedEntry: DBImageEntry = {
      ...existing,
      metadata: record,
    };

    const request = store.put(updatedEntry);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to update metadata for record: ${record.id}`));
    };
  });
}

/**
 * Deletes an image record from local cache
 */
export async function deleteImageRecord(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete record ${id}`));
    };
  });
}

/**
 * Clears both client and server database
 */
export async function clearAllRecords(): Promise<void> {
  const db = await initDB();
  
  // Clear server DB
  try {
    await fetch("/api/images", { method: "DELETE" });
  } catch (err) {
    console.warn("Failed to clear server-side database:", err);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("Failed to clear IndexedDB store"));
    };
  });
}

/**
 * Sync server metadata database with local databases
 */
export async function syncWithServer(localRecords: AnimalRecord[]): Promise<void> {
  try {
    // 1. Fetch server records
    const res = await fetch("/api/images");
    if (!res.ok) throw new Error("Could not fetch server records");
    const serverRecords: AnimalRecord[] = await res.json();

    const serverIds = new Set(serverRecords.map(r => r.id));
    
    // 2. Upload any local records not on server
    for (const record of localRecords) {
      if (!serverIds.has(record.id)) {
        // Stripe/omit thumbnail if too large, but thumbnail is extremely tiny compressed, so we can sync it
        await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        });
      }
    }
  } catch (err) {
    console.error("Database sync warning (working in offline mode):", err);
  }
}
