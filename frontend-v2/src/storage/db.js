import { openDB } from 'idb'

const DB_NAME = 'book-ocr-v2'
const DB_VERSION = 1

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('pages')) {
        const store = db.createObjectStore('pages', { keyPath: 'id' })
        store.createIndex('projectId', 'projectId')
        store.createIndex('projectId_pageNumber', ['projectId', 'pageNumber'])
      }
    },
  })
}
