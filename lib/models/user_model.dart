class UserModel {
  final String uid;
  final String? activeRole;

  // Add other user properties here if needed in the future,
  // such as name or email, which could be decoded from a JWT.

  UserModel({required this.uid, this.activeRole});

  // Example of how you might create a user from a JWT payload in a real app:
  // factory UserModel.fromJwt(Map<String, dynamic> payload) {
  //   return UserModel(
  //     uid: payload['uid'] as String,
  //     activeRole: payload['role'] as String?,
  //   );
  // }
}
