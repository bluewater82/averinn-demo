\ LP format - for model browsing. Use MPS format to capture full model detail.
\ Signature: 0xd9d330da5b987762
Maximize
  X_2
Subject To
 R0: X_1 >= 1
 R1: X_2 >= 1
 R2: X_1 <= 1
 R3: X_2 <= 1
 R4: alpha_1 <= 1
 R5: - alpha_1 <= 1
 R6: alpha_2 <= 1
 R7: - alpha_2 <= 1
 R8: 0.25 alpha_1 - 0.5 alpha_2 <= 1.75
Bounds
 X_1 free
 X_2 free
 alpha_1 free
 alpha_2 free
End
