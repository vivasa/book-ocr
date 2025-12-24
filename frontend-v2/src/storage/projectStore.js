import { getDb } from './db.js'

export async function listProjects() {
  const db = await getDb()
  const projects = await db.getAll('projects')
  projects.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  return projects
}

export async function getProject(projectId) {
  const db = await getDb()
  return db.get('projects', projectId)
}

export async function upsertProject(project) {
  const db = await getDb()
  await db.put('projects', project)
}

export async function deleteProject(projectId) {
  const db = await getDb()
  const tx = db.transaction(['projects', 'pages'], 'readwrite')
  await tx.objectStore('projects').delete(projectId)
  const pageIds = await tx.objectStore('pages').index('projectId').getAllKeys(projectId)
  for (const id of pageIds) {
    await tx.objectStore('pages').delete(id)
  }
  await tx.done
}

export async function listPages(projectId) {
  const db = await getDb()
  const pages = await db.getAllFromIndex('pages', 'projectId', projectId)
  pages.sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0))
  return pages
}

export async function getPage(pageId) {
  const db = await getDb()
  return db.get('pages', pageId)
}

export async function upsertPage(page) {
  const db = await getDb()
  await db.put('pages', page)
}

export async function bulkUpsertPages(pages) {
  const db = await getDb()
  const tx = db.transaction('pages', 'readwrite')
  for (const page of pages) {
    await tx.store.put(page)
  }
  await tx.done
}
