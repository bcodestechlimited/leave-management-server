import asyncWrapper from "../../middlewares/asyncWrapper.js";
import tenantService from "../services/tenant.service.js";

export const tenantLogin = asyncWrapper(async (req, res, next) => {
  const tenantData = req.body;
  const result = await tenantService.tenantLogin(tenantData);
  res.status(200).json(result);
});

export const updateTenantProfile = asyncWrapper(async (req, res, next) => {
  const tenantData = req.body;
  const { tenantId } = req.tenantAdmin;
  const result = await tenantService.updateTenantProfile(
    tenantId,
    tenantData,
    req?.files ? req.files : {}
  );
  res.status(200).json(result);
});

export const tenantForgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  const result = await tenantService.forgotPassword(email);
  res.status(201).json(result);
});

export const tenantResetPassword = asyncWrapper(async (req, res, next) => {
  const { token, password } = req.body;
  const result = await tenantService.resetPassword(token, password);
  res.status(201).json(result);
});

export const getTenantDetails = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const result = await tenantService.getTenant(tenantId);
  res.status(200).json(result);
});

export const getAllInviteLinks = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const result = await tenantService.getLinks(req.query, tenantId);
  res.status(200).json(result);
});

//Public
export const getTenant = asyncWrapper(async (req, res, next) => {
  const tenantId = req.params.tenantId;
  const result = await tenantService.getTenant(tenantId);
  res.status(200).json(result);
});
