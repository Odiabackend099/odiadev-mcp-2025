// lib/monitoring.js - Production Monitoring and Security System
const config = require('./config');

class ProductionMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      successfulPayments: 0,
      failedPayments: 0,
      ttsRequests: 0,
      webhookEvents: 0,
      securityEvents: 0,
      startTime: Date.now()
    };
    
    this.securityEvents = [];
    this.performanceMetrics = [];
  }

  // Record security events
  recordSecurityEvent(type, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details: this.sanitizeSecurityData(details),
      severity: this.calculateSeverity(type)
    };
    
    this.securityEvents.push(event);
    this.metrics.securityEvents++;
    
    // Keep only last 100 security events in memory
    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }
    
    // Log high-severity events immediately
    if (event.severity === 'HIGH') {
      console.error('[SECURITY]', event);
    }
  }

  // Record performance metrics
  recordPerformance(endpoint, duration, status) {
    const metric = {
      timestamp: Date.now(),
      endpoint,
      duration,
      status,
      success: status < 400
    };
    
    this.performanceMetrics.push(metric);
    
    // Keep only last 1000 performance metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }
    
    // Alert on slow responses
    if (duration > 5000) { // 5 seconds
      console.warn('[PERFORMANCE] Slow response:', metric);
    }
  }

  // Record business metrics
  recordBusinessEvent(type, data) {
    switch (type) {
      case 'payment_initiated':
        this.metrics.requests++;
        break;
      case 'payment_successful':
        this.metrics.successfulPayments++;
        break;
      case 'payment_failed':
        this.metrics.failedPayments++;
        this.metrics.errors++;
        break;
      case 'tts_request':
        this.metrics.ttsRequests++;
        break;
      case 'webhook_received':
        this.metrics.webhookEvents++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
    }
  }

  // Get health summary
  getHealthSummary() {
    const uptime = Date.now() - this.metrics.startTime;
    const recentSecurityEvents = this.securityEvents.filter(
      event => Date.now() - new Date(event.timestamp).getTime() < 3600000 // Last hour
    );
    
    const recentPerformance = this.performanceMetrics.filter(
      metric => Date.now() - metric.timestamp < 300000 // Last 5 minutes
    );
    
    const avgResponseTime = recentPerformance.length > 0 
      ? recentPerformance.reduce((sum, m) => sum + m.duration, 0) / recentPerformance.length
      : 0;
    
    return {
      status: this.calculateOverallHealth(),
      uptime: uptime,
      metrics: this.metrics,
      security: {
        recentEvents: recentSecurityEvents.length,
        highSeverityEvents: recentSecurityEvents.filter(e => e.severity === 'HIGH').length
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        successRate: this.calculateSuccessRate(),
        requestsPerMinute: this.calculateRequestsPerMinute()
      },
      nigerian_readiness: {
        payment_success_rate: this.calculatePaymentSuccessRate(),
        tts_availability: this.calculateTTSAvailability(),
        webhook_processing: this.metrics.webhookEvents > 0
      }
    };
  }

  // Calculate overall system health
  calculateOverallHealth() {
    const successRate = this.calculateSuccessRate();
    const recentSecurityIssues = this.securityEvents.filter(
      event => Date.now() - new Date(event.timestamp).getTime() < 3600000 &&
               event.severity === 'HIGH'
    ).length;
    
    if (recentSecurityIssues > 5 || successRate < 0.9) {
      return 'degraded';
    }
    
    if (successRate < 0.95) {
      return 'warning';
    }
    
    return 'healthy';
  }

  calculateSuccessRate() {
    const total = this.metrics.requests;
    if (total === 0) return 1;
    return (total - this.metrics.errors) / total;
  }

  calculatePaymentSuccessRate() {
    const totalPayments = this.metrics.successfulPayments + this.metrics.failedPayments;
    if (totalPayments === 0) return 1;
    return this.metrics.successfulPayments / totalPayments;
  }

  calculateTTSAvailability() {
    return this.metrics.ttsRequests > 0 ? 0.99 : 1; // Assume 99% if used
  }

  calculateRequestsPerMinute() {
    const uptime = (Date.now() - this.metrics.startTime) / 1000 / 60; // minutes
    return uptime > 0 ? Math.round(this.metrics.requests / uptime) : 0;
  }

  calculateSeverity(eventType) {
    const highSeverityEvents = [
      'multiple_failed_auth',
      'suspicious_activity',
      'potential_injection',
      'rate_limit_exceeded',
      'invalid_webhook_signature'
    ];
    
    const mediumSeverityEvents = [
      'failed_auth',
      'invalid_request',
      'service_error'
    ];
    
    if (highSeverityEvents.includes(eventType)) return 'HIGH';
    if (mediumSeverityEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  sanitizeSecurityData(data) {
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive information
    delete sanitized.apiKey;
    delete sanitized.password;
    delete sanitized.token;
    
    // Truncate potentially large fields
    if (sanitized.userAgent) {
      sanitized.userAgent = sanitized.userAgent.substring(0, 100);
    }
    
    if (sanitized.ip) {
      // Partially mask IP for privacy
      sanitized.ip = sanitized.ip.replace(/\d+$/, 'xxx');
    }
    
    return sanitized;
  }

  // Export metrics for external monitoring
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      service: 'odiadev-mcp-server',
      version: config.app.version,
      environment: config.app.environment,
      health: this.getHealthSummary(),
      detailed_metrics: this.metrics
    };
  }
}

// Singleton instance
const monitor = new ProductionMonitor();

module.exports = monitor;