\ LP format - for model browsing. Use MPS format to capture full model detail.
\ Signature: 0xd1e6690a23240894
Maximize
  X_1
Subject To
 R0: X_1 - 0.125 alpha_1 - 0.5 alpha_2 = 3.375
 R1: alpha_1 <= 1
 R2: - alpha_1 <= 1
 R3: alpha_2 <= 1
 R4: - alpha_2 <= 1
 R5: 0.5 alpha_1 - 0.5 alpha_2 <= 1
 R6: - 0.25 alpha_1 - alpha_2 <= 4.75
Bounds
 X_1 free
 alpha_1 free
 alpha_2 free
End
