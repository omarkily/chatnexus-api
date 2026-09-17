import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { authenticate } from '../middlewares/authMiddleware';
import { ApplicationService } from '../services/applicationService';

const router = Router();
const applicationService = new ApplicationService();
const accountController = new AccountController();

// All account routes require authentication
router.use(authenticate(applicationService));

// Get all accounts
router.get('/', accountController.getAllAccounts.bind(accountController));

// Get a specific account by ID
router.get('/:id', accountController.getAccountById.bind(accountController));

// Get account by reference ID
router.get('/ref/:referrenceId', accountController.getAccountByReferrenceId.bind(accountController));

// Create a new account
router.post('/', accountController.createAccount.bind(accountController));

// Update an account
router.patch('/:id', accountController.updateAccount.bind(accountController));

// Delete an account
router.delete('/:id', accountController.deleteAccount.bind(accountController));

// Add a user to an account
router.post('/:id/users', accountController.addUserToAccount.bind(accountController));

// Remove a user from an account
router.delete('/:id/users', accountController.removeUserFromAccount.bind(accountController));

export default router; 