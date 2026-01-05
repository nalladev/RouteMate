/// API Configuration
/// 
/// This file contains the base URL for the backend API server.
/// Set the [apiBaseUrl] to your deployed backend URL before building for production.
class ApiConfig {
  /// The base URL for the backend API.
  /// 
  /// Examples:
  /// - Local development: 'http://localhost:3000/api'
  /// - Production: 'https://your-backend-domain.com/api'
  /// 
  /// Leave empty to throw an error if not configured.
  static const String apiBaseUrl = '';
  
  /// Returns the configured API base URL.
  /// Throws an error if the URL is not configured.
  static String get baseUrl {
    if (apiBaseUrl.isEmpty) {
      throw Exception(
        'API base URL is not configured. '
        'Please set ApiConfig.apiBaseUrl in lib/config/api_config.dart'
      );
    }
    return apiBaseUrl;
  }
  
  /// Returns true if the API base URL is configured.
  static bool get isConfigured => apiBaseUrl.isNotEmpty;
}
