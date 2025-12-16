\ LP format - for model browsing. Use MPS format to capture full model detail.
\ Signature: 0x7f51d7a8ae94b504
Maximize
  X_2
Subject To
 R0: X_1 - 0.125 alpha_1 - 0.375 alpha_2 = 3
 R1: X_2 + 0.25 alpha_1 + 0.75 alpha_2 = -3
 R2: alpha_1 <= 1
 R3: - alpha_1 <= 1
 R4: alpha_2 <= 1
 R5: - alpha_2 <= 1
 R6: 0.5 alpha_1 - 0.5 alpha_2 <= 1
 R7: - 0.25 alpha_1 - 0.75 alpha_2 <= 4
Bounds
 X_1 free
 X_2 free
 alpha_1 free
 alpha_2 free
End
