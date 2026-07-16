import { AuditAction } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { companyRepository } from "../repositories/company.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { UpdateCompanyInput } from "../validators/company.validators.js";

export async function getCompany(companyId: string) {
  const company = await companyRepository.findById(companyId);
  if (!company) throw new HttpError(404, "Company not found");
  return company;
}

export async function updateCompany(
  companyId: string,
  userId: string,
  payload: UpdateCompanyInput,
) {
  const company = await companyRepository.update(companyId, payload);
  await writeAuditLog({ action: AuditAction.COMPANY_UPDATED, companyId, userId });
  return company;
}
