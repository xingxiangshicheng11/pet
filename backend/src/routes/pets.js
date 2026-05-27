import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { createPet, getMyPets, getPet, updatePet, deletePet } from "../controllers/petController.js";

const router = Router();
router.use(authenticate);

router.post("/", createPet);
router.get("/", getMyPets);
router.get("/:id", getPet);
router.put("/:id", updatePet);
router.delete("/:id", deletePet);

export default router;
