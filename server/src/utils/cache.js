// Map insertion order makes eviction deterministic. This cache is per process.
export class TtlCache {
  constructor({ ttl = 60000, maximum = 100, now = Date.now } = {}) {
    Object.assign(this, { ttl, maximum, now });
    this.entries = new Map();
  }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value) {
    this.entries.delete(key);
    if (this.entries.size >= this.maximum)
      this.entries.delete(this.entries.keys().next().value);
    this.entries.set(key, { value, expires: this.now() + this.ttl });
  }
}
