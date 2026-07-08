import { vi } from 'vitest'

// Mock IndexedDB for happy-dom (does not support IndexedDB natively)
// Tests that need the database will mock the db module directly
