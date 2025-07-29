const { performance } = require('perf_hooks');

/**
 * Middleware pour tracker les temps de réponse des requêtes
 */
const timetracker = (req, res, next) => {
  const startTime = performance.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Ajouter l'ID de requête à l'objet request
  req.requestId = requestId;
  
  // Stocker les métriques de performance
  req.performanceMetrics = {
    startTime,
    requestId,
    timers: new Map(),
    logs: []
  };
  
  // Fonction pour démarrer un timer
  req.startTimer = (name) => {
    const timerName = `${requestId}_${name}`;
    req.performanceMetrics.timers.set(timerName, performance.now());
    req.performanceMetrics.logs.push({
      timestamp: new Date().toISOString(),
      action: 'start_timer',
      name,
      requestId
    });
    return timerName;
  };
  
  // Fonction pour arrêter un timer et logger le temps
  req.stopTimer = (name) => {
    const timerName = `${requestId}_${name}`;
    const startTime = req.performanceMetrics.timers.get(timerName);
    
    if (startTime) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      req.performanceMetrics.timers.delete(timerName);
      req.performanceMetrics.logs.push({
        timestamp: new Date().toISOString(),
        action: 'stop_timer',
        name,
        duration: `${duration.toFixed(2)}ms`,
        requestId
      });
      
      // Logger le temps de performance
      console.log(`⏱️  [${requestId}] ${name}: ${duration.toFixed(2)}ms`);
      
      return duration;
    }
    
    return null;
  };
  
  // Fonction pour logger un événement
  req.logEvent = (event, details = {}) => {
    req.performanceMetrics.logs.push({
      timestamp: new Date().toISOString(),
      action: 'event',
      event,
      details,
      requestId
    });
    console.log(`📝 [${requestId}] ${event}:`, details);
  };
  
  // Intercepter la fin de la réponse pour calculer le temps total
  const originalSend = res.send;
  res.send = function(data) {
    const totalTime = performance.now() - startTime;
    
    // Logger le temps total de la requête
    console.log(`🚀 [${requestId}] ${req.method} ${req.originalUrl}: ${totalTime.toFixed(2)}ms`);
    
    // Ajouter les métriques de performance à la réponse si c'est du JSON
    if (typeof data === 'string' && data.startsWith('{')) {
      try {
        const jsonData = JSON.parse(data);
        jsonData._performance = {
          requestId,
          totalTime: `${totalTime.toFixed(2)}ms`,
          logs: req.performanceMetrics.logs
        };
        return originalSend.call(this, JSON.stringify(jsonData));
      } catch (e) {
        // Si ce n'est pas du JSON valide, envoyer la réponse originale
        return originalSend.call(this, data);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = timetracker; 