import type { Metadata } from 'next';
import { Building2, Target, Compass } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hakkımızda — ISTBAKU',
  description:
    'ISTBAKU\'nun hikayesi, misyonu ve vizyonu. İstanbul ve Bakü\'den dünyaya uzanan, teknoloji ve güven temelli emlak platformu.',
};

// Statik kurumsal içerik — Hakkımızda + Misyonumuz + Vizyonumuz tek sayfada.
export default function HakkimizdaPage() {
  return (
    <div className="bg-[color:var(--bg)]">
      {/* Üst başlık — koyu lacivert, marka dokusu */}
      <section className="dark relative overflow-hidden bg-[#121F30] text-white">
        <div
          className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(202,174,153,0.30) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-[520px] h-[520px] rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(202,174,153,0.22) 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <span className="inline-block text-[11px] uppercase tracking-[0.22em] text-gold-300 font-semibold">
            ISTBAKU
          </span>
          <h1 className="font-display mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
            İstanbul'dan Bakü'ye, oradan dünyaya
          </h1>
          <p className="mt-4 text-sm sm:text-base text-navy-100/80 max-w-2xl mx-auto">
            Teknoloji, insan deneyimi ve sektör bilgisini tek bir platformda buluşturan emlak ekosistemi.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-14">
        {/* Hakkımızda */}
        <Section icon={Building2} kicker="Hikayemiz" title="Hakkımızda">
          <p>
            ISTBAKU'nun hikayesi, yıllardır Türkiye'de yaşayan Azerbaycanlı bir girişimci gencin sektörde
            gördüklerinden doğdu. Farklı girişimlerin devamında İstanbul'da emlakçılık yaparken fark edildi:
            platformlar pahalı ama verimsiz, teknoloji geride kalıyor, kullanıcıların gerçek ihtiyaçları ise
            çoğu zaman görünmüyor bile. Bu boşluğu doldurmak için ISTBAKU kuruldu.
          </p>
          <p>
            İsmin hikayesi tesadüf değil. IST İstanbul'u, BAKU ise Bakü'yü temsil ediyor. Biraz milliyetçi bir
            damardan, biraz da bu iki şehrin bıraktığı izden doğan bu isimle Azerbaycan ve Türkiye'de doğan bu
            sistemi dünyaya tanıtma yolculuğu başladı. Azerbaycan ve Türkiye pazarında başlayıp bu iki pazarda
            altyapıyı tam oturttuktan sonra belirlenen ülkelerde aynı güçle yola devam edilecek. Sektörün içinden
            gelen bu bakış açısı, ISTBAKU'nun her özelliğine, her kararına sinmiştir.
          </p>
        </Section>

        {/* Misyonumuz */}
        <Section icon={Target} kicker="Ne için varız" title="Misyonumuz">
          <p>
            ISTBAKU'nun misyonu basit ama güçlüdür: emlak sürecinde yer alan herkesin işini doğru, verimli ve
            keyifle yapabileceği bir ortam kurmak. Alıcı, satıcı, emlakçı ve yatırımcı — bu dört taraf aynı sürecin
            farklı aktörleridir. Her birinin ihtiyacı farklı, beklentisi farklı, zamanı kıymetlidir. ISTBAKU, bu
            dört tarafı aynı platformda buluşturarak herkesin kendi rolünde en iyi şekilde hareket edebilmesini
            sağlar.
          </p>
          <p>
            Bunu yaparken teknoloji bizim en güçlü aracımızdır. Yapay zeka destekli yatırım skoruyla yatırımcıya
            veriye dayalı kararlar aldırıyor, akıllı ilan asistanıyla emlakçının ilanını dakikalar içinde
            hazırlamasını sağlıyoruz. Bölge yaşam profili analiziyle alıcıya sadece bir mülk değil, bir yaşam alanı
            sunuyoruz. Tapu doğrulama ve onaylı ilan sistemiyle satıcı ve alıcı arasında güven köprüsü kuruyoruz.
            Mülk sahiplerine ise yalnızca satış ve uzun dönem kiralama değil; takvim yönetimi, online rezervasyon ve
            güvenli ödeme altyapısıyla günlük kiralama imkânı da sunuyoruz. Böylece bir mülk, sahibi için gerçek
            anlamda çalışan bir yatırıma dönüşür.
          </p>
          <p>
            Platformumuzda her ilan bir standarda tabidir. ISTBAKU Onaylı rozeti ve Gold Partner kriterleri yalnızca
            birer ödül değil; kaliteyi ölçülebilir kılan bir güven mimarisidir. Sektörün içinden gelerek kurduğumuz
            bu platform; aceleyle değil, doğruyu bilerek tasarlandı. Çünkü biz iyi bir yazılım değil, gerçekten işe
            yarayan bir sistem kurmak istiyoruz.
          </p>
        </Section>

        {/* Vizyonumuz */}
        <Section icon={Compass} kicker="Nereye gidiyoruz" title="Vizyonumuz">
          <p>
            ISTBAKU, emlak dünyasını yeniden tanımlamak için kuruldu. Bir ilanı listelemek artık yeterli değil.
            Yatırımcı doğru kararı verebilmeli, emlakçı güvenle çalışabilmeli, alıcı ise süreci şeffaf ve kolay bir
            şekilde tamamlayabilmelidir. Bu üçü bir arada olduğunda, emlak sektörü gerçek anlamda gelişir.
          </p>
          <p>
            Türkiye ve Azerbaycan'dan dünyaya uzanan bu yolculukta vizyonumuz nettir: dünyanın her ülkesinde
            tanınan, güvenilen ve tercih edilen bir emlak platformu olmak. Bunu başarmak için teknolojiyi, insan
            deneyimini ve sektör bilgisini tek bir platformda bir araya getiriyoruz. Yapay zeka ile yatırım
            kararlarını kolaylaştırıyor, güven sistemiyle emlak süreçlerini şeffaf hale getiriyoruz. Bunun yanı sıra
            günlük kiralama ihtiyaçlarını da aynı çatı altında karşılıyoruz: takvim yönetimi, online rezervasyon ve
            güvenli ödeme altyapısıyla mülk sahiplerine ve kiracılara uçtan uca bir deneyim sunuyoruz.
          </p>
          <p>
            Her yeni ülkede, o ülkenin kültürünü ve dinamiklerini içselleştirerek büyüyoruz. Çünkü iyi bir emlak
            platformu herkese aynı şeyi sunan bir site değil; her kullanıcıya kendi ihtiyacını anlayan bir rehber
            gibi davranan bir platformdur. ISTBAKU; yatırımcının en güvendiği adres, emlakçının en güçlü iş ortağı,
            alıcının ise en doğru rehberi olmayı hedefler. Bugün iki ülkede attığımız bu adım, yarın tüm dünyada
            hissedilecek.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  kicker,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="size-10 rounded-xl bg-gold-400/15 text-gold-300 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </span>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold-300 font-semibold">{kicker}</div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-[color:var(--fg-muted)]">{children}</div>
    </section>
  );
}
