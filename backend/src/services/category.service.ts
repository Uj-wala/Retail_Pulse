import { AuditAction } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../validators/category.validators.js";

export function listCategories(companyId: string) {
  return categoryRepository.findManyByCompany(companyId);
}

export async function getCategory(companyId: string, id: string) {
  const category = await categoryRepository.findById(companyId, id);
  if (!category) throw new HttpError(404, "Category not found");
  return category;
}

export async function createCategory(companyId: string, userId: string, payload: CreateCategoryInput) {
  const existing = await categoryRepository.findByName(companyId, payload.name);
  if (existing) throw new HttpError(409, "A category with this name already exists");

  const category = await categoryRepository.create({
    companyId,
    name: payload.name.trim(),
    description: payload.description?.trim(),
  });
  await writeAuditLog({ action: AuditAction.CATEGORY_CREATED, companyId, userId });
  return category;
}

export async function updateCategory(
  companyId: string,
  userId: string,
  id: string,
  payload: UpdateCategoryInput,
) {
  await getCategory(companyId, id);
  const category = await categoryRepository.update(id, payload);
  await writeAuditLog({ action: AuditAction.CATEGORY_UPDATED, companyId, userId });
  return category;
}

export async function deleteCategory(companyId: string, userId: string, id: string) {
  await getCategory(companyId, id);
  const productCount = await categoryRepository.countProducts(id);
  if (productCount > 0) {
    throw new HttpError(409, "Cannot delete a category that still has products assigned to it");
  }
  await categoryRepository.delete(id);
  await writeAuditLog({ action: AuditAction.CATEGORY_DELETED, companyId, userId });
}
