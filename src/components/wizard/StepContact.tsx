import { type FC, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { wilayas } from '@/data/wilayas';
import { useWizardStore } from '@/store/wizardStore';

const inputClasses = 'min-h-12 w-full rounded-xl border bg-surface px-4 py-3 text-base text-text-primary outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:ring-offset-1';

export const StepContact: FC = () => {
  const contact = useWizardStore((s) => s.contact);
  const setContact = useWizardStore((s) => s.setContact);
  const nextStep = useWizardStore((s) => s.nextStep);

  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [wilaya, setWilaya] = useState(contact?.wilaya ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fieldError = (field: keyof typeof errors) =>
    errors[field] ? (
      <p id={`${field}-error`} role="alert" className="mt-1 text-xs text-error">
        {errors[field]}
      </p>
    ) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Veuillez entrer votre nom.';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 9 || phoneDigits.length > 13) {
      newErrors.phone = 'Veuillez entrer un numéro valide (ex : 0555 00 00 00).';
    }

    if (!wilaya) {
      newErrors.wilaya = 'Veuillez choisir votre wilaya.';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Veuillez entrer un email valide.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const trimmedEmail = email.trim();
    setContact({
      name: name.trim(),
      phone: phoneDigits,
      wilaya,
      ...(trimmedEmail && { email: trimmedEmail }),
    });
    nextStep();
  };

  return (
    <div className="mx-auto max-w-md">
      <h3 className="text-center text-xl font-bold text-text-primary sm:text-2xl mb-2">
        Vos informations
      </h3>
      <p className="mb-6 text-center text-sm text-text-muted">
        Nous gardons ces informations pour préparer votre estimation et vous répondre.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="wizard-name" className="block text-sm font-medium text-text-primary mb-1.5">
            Nom complet
          </label>
          <input
            id="wizard-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ahmed Benali"
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`${inputClasses} ${errors.name ? 'border-error' : 'border-border'}`}
          />
          {fieldError('name')}
        </div>

        <div>
          <label htmlFor="wizard-phone" className="block text-sm font-medium text-text-primary mb-1.5">
            Téléphone / WhatsApp
          </label>
          <input
            id="wizard-phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            placeholder="Ex: 0555 00 00 00"
            autoComplete="tel"
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={`${inputClasses} ${errors.phone ? 'border-error' : 'border-border'}`}
          />
          {fieldError('phone')}
        </div>

        <div>
          <label htmlFor="wizard-wilaya" className="block text-sm font-medium text-text-primary mb-1.5">
            Wilaya
          </label>
          <select
            id="wizard-wilaya"
            name="wilaya"
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
            required
            aria-invalid={Boolean(errors.wilaya)}
            aria-describedby={errors.wilaya ? 'wilaya-error' : undefined}
            className={`${inputClasses} cursor-pointer appearance-none ${errors.wilaya ? 'border-error' : 'border-border'}`}
          >
            <option value="">Choisissez votre wilaya</option>
            {wilayas.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          {fieldError('wilaya')}
        </div>

        <div>
          <label htmlFor="wizard-email" className="block text-sm font-medium text-text-primary mb-1.5">
            Email <span className="text-text-muted font-normal">optionnel</span>
          </label>
          <input
            id="wizard-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="exemple@email.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`${inputClasses} ${errors.email ? 'border-error' : 'border-border'}`}
          />
          {fieldError('email')}
        </div>

        <Button type="submit" className="w-full">
          Continuer
        </Button>
      </form>
    </div>
  );
};
