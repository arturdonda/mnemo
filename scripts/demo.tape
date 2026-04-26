Output website/assets/demo.gif

Set FontSize 13
Set Width 110
Set Height 36
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

# Run: npm link (once) then: vhs scripts/demo.tape

Hide
Exec "rm -rf /tmp/mnemo-demo && mkdir -p /tmp/mnemo-demo"
Exec "cd /tmp/mnemo-demo && git init -q && git remote add origin https://github.com/acme/payment-api.git"
Exec "cd /tmp/mnemo-demo && mnemo init 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat start payment-integration --branch feature/payment-integration 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat decision 'Using Stripe Checkout, not Payment Intents — simpler for MVP scope' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat decision 'Orders stay in PENDING until Stripe webhook confirms payment' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat decision 'Webhook at /api/webhooks/stripe, verified via Stripe-Signature header' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat link-file src/routes/payments.ts --reason 'main route handler' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat link-file src/services/stripe.ts 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat link-file src/models/order.ts 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat blocker 'Webhook signature validation failing in test env' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat blocker resolve 'Webhook signature validation failing in test env' 2>/dev/null; true"
Exec "cd /tmp/mnemo-demo && mnemo feat status 'Webhook handler implemented, writing tests' 2>/dev/null; true"
Show

Sleep 800ms

Type "cd /tmp/mnemo-demo"
Enter
Sleep 500ms

Type "# AI agent reads this at every session start"
Enter
Sleep 400ms

Type "mnemo feat context"
Sleep 700ms
Enter
Sleep 3s
