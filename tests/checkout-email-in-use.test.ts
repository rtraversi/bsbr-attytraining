import { render } from '@react-email/render'
import { describe, expect, it } from 'vitest'
import { CheckoutEmailInUseEmail } from '@/emails/checkout-email-in-use'

describe('CheckoutEmailInUseEmail', () => {
  it('does not promise a refund after cancelling the duplicate subscription', async () => {
    const html = await render(
      CheckoutEmailInUseEmail({ email: 'buyer@example.com', cancelled: true })
    )

    expect(html).toContain('Please contact us so we can review the payment with you.')
    expect(html).toContain('review your payment and help you get set up on a different address')
    expect(html).not.toContain('payment is being refunded')
    expect(html).not.toContain('Refunds usually take')
  })

  it('does not claim billing stopped when cancelling the subscription failed', async () => {
    const html = await render(
      CheckoutEmailInUseEmail({ email: 'buyer@example.com', cancelled: false })
    )

    expect(html).toContain('Your subscription needs attention')
    expect(html).toContain('stop it and review the payment with you')
    expect(html).not.toContain('You will not be charged again')
    expect(html).not.toContain('payment is being refunded')
  })
})
