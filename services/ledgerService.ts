
import { AccountStatus, AuditLogEntry, UserProfile, UserRole } from "../types";
import { ethers } from "ethers";

// Simple UUID generator fallback
const safeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Extended interface for internal storage (includes password)
interface StoredUser extends UserProfile {
  passwordHash: string; // In a real app, this would be bcrypt/argon2
}

// Mock Database with Password support
let MOCK_USERS: StoredUser[] = [
  {
    address: "0xAdmin...8888",
    name: "Dr. Admin User", // Matches Demo Admin Name fallback or generic
    institute: "Central Oversight Committee",
    role: UserRole.INSTITUTE_ADMIN,
    status: AccountStatus.APPROVED,
    joinedAt: Date.now(),
    passwordHash: "demo123" // Matched to UI Demo Defaults
  },
  {
    address: "0xRes...1234",
    name: "Demo Researcher", // Matches LoginView triggerDemo name
    institute: "Demo Institute",
    role: UserRole.RESEARCHER,
    status: AccountStatus.APPROVED,
    joinedAt: Date.now() - 31536000000, // Joined 1 year ago
    passwordHash: "demo123",
    // Rich Profile Data
    bio: "Senior Research Fellow specializing in Generative AI and Graph Neural Networks. Passionate about bridging the gap between symbolic reasoning and deep learning architectures to accelerate scientific discovery.",
    specializations: ["Artificial Intelligence", "Graph Theory", "Genomics", "Machine Learning"],
    collaborators: ["Dr. Elena R.", "K. Chen", "Sarah J.", "M. Al-Fayed"],
    publications: 12,
    citations: 345
  },
  {
    address: "0xRev...5678",
    name: "Demo Reviewer", // Matches LoginView triggerDemo name for Reviewer
    institute: "Review Board Alpha",
    role: UserRole.REVIEWER,
    status: AccountStatus.APPROVED,
    joinedAt: Date.now(),
    passwordHash: "demo123",
    bio: "Experienced peer reviewer with a focus on reproducibility and statistical validity in computational biology papers.",
    specializations: ["Peer Review", "Statistical Analysis", "Bioinformatics"],
    collaborators: [],
    publications: 5,
    citations: 120
  }
];

let MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "genesis",
    timestamp: Date.now() - 100000,
    actor: "SYSTEM",
    action: "GENESIS_BLOCK",
    details: "Ledger initialized for IRDA Security",
    blockHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
  }
];

// Helper to simulate hashing
const generateHash = (data: string) => {
  return ethers.keccak256(ethers.toUtf8Bytes(data + Date.now().toString()));
};

export const ledgerService = {
  
  // --- AUTH & USER MANAGEMENT ---

  /**
   * Handles both Login (if user exists) and Registration (if new).
   * Requires password for both.
   */
  async authenticateUser(
    address: string, 
    name: string, 
    institute: string, 
    role: UserRole,
    password: string
  ): Promise<UserProfile> {
    
    // 1. Check if user already exists
    const existing = MOCK_USERS.find(u => u.address === address);
    
    if (existing) {
      // LOGIN ATTEMPT
      if (existing.passwordHash !== password) {
        this.recordAction(address, "LOGIN_FAILED", "Invalid password attempt");
        throw new Error("Invalid credentials. Please check your password.");
      }
      
      this.recordAction(address, "USER_LOGIN", "Successful authentication");
      // Return profile without password
      const { passwordHash, ...profile } = existing;
      return profile;
    }

    // 2. REGISTRATION ATTEMPT
    // Default status: Admins are approved (for demo), Researchers/Reviewers are PENDING
    const status = role === UserRole.INSTITUTE_ADMIN ? AccountStatus.APPROVED : AccountStatus.PENDING;

    const newUser: StoredUser = {
      address,
      name,
      institute,
      role,
      status,
      joinedAt: Date.now(),
      passwordHash: password,
      bio: "New researcher profile.",
      specializations: [],
      collaborators: [],
      publications: 0,
      citations: 0
    };

    MOCK_USERS.push(newUser);

    // Audit Log
    this.recordAction(address, "USER_REGISTRATION", `Role: ${role}, Institute: ${institute}`);

    // Return profile without password
    const { passwordHash, ...profile } = newUser;
    return profile;
  },

  async approveUser(adminAddress: string, targetAddress: string): Promise<void> {
    const admin = MOCK_USERS.find(u => u.address === adminAddress);
    if (!admin || admin.role !== UserRole.INSTITUTE_ADMIN) {
      throw new Error("Unauthorized: Only Admins can approve users.");
    }

    const targetUser = MOCK_USERS.find(u => u.address === targetAddress);
    if (targetUser) {
      targetUser.status = AccountStatus.APPROVED;
      this.recordAction(adminAddress, "APPROVE_ACCESS", `Approved ${targetUser.role}: ${targetUser.name} (${targetAddress})`);
    }
  },

  async rejectUser(adminAddress: string, targetAddress: string): Promise<void> {
    const targetUser = MOCK_USERS.find(u => u.address === targetAddress);
    if (targetUser) {
      targetUser.status = AccountStatus.REJECTED;
      this.recordAction(adminAddress, "REJECT_ACCESS", `Rejected ${targetUser.role}: ${targetUser.name}`);
    }
  },

  async updateUserStatus(adminAddress: string, targetAddress: string, status: AccountStatus): Promise<void> {
      const targetUser = MOCK_USERS.find(u => u.address === targetAddress);
      if (targetUser) {
          targetUser.status = status;
          this.recordAction(adminAddress, "UPDATE_STATUS", `Changed status of ${targetUser.name} to ${status}`);
      }
  },

  getPendingUsers(): UserProfile[] {
    return MOCK_USERS.filter(u => u.status === AccountStatus.PENDING)
      .map(({ passwordHash, ...user }) => user);
  },

  getAllUsers(): UserProfile[] {
      return MOCK_USERS.map(({ passwordHash, ...user }) => user);
  },

  // --- AUDIT & LEDGER ---

  recordAction(actor: string, action: string, details: string) {
    const entry: AuditLogEntry = {
      id: safeUUID(),
      timestamp: Date.now(),
      actor,
      action,
      details,
      blockHash: generateHash(`${actor}:${action}:${details}`)
    };
    MOCK_AUDIT_LOG.unshift(entry); // Add to top
  },

  getAuditTrail(): AuditLogEntry[] {
    return MOCK_AUDIT_LOG;
  }
};
