"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const member_controller_1 = require("../controllers/member.controller");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.protect, tenant_middleware_1.loadTenantDB);
router.post('/invite', (0, rbac_middleware_1.requireRole)('ADMIN'), member_controller_1.inviteMember);
exports.default = router;
