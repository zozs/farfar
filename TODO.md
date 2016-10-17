TODO för Slack-FARFAR
=====================

 * Fixa så vi håller reda på lista med namn och e-post för deltagare.
   * Lämpligen är denna lista sorterad så att den främst i listan ordnar fika
     nästföljande tillfälle. När fika hållits (aka när sista påminnelsen skickats
     ut, så roteras listan.
 * Lägg till kommandon för att lägga till och ta bort användare.
   * add epost@example.com Linus K
     Lägger till en användare (använd allt efter e-post som namn)
   * remove epost@example.com
     Radera från lista. 
   * move epost@example.com 1
     Flytta användare till plats 1 (0 är veckans fikaansvarig, 1 nästa veckas osv)
   * list
     List the current list in order.
 * Lägg till hjälpkommando
   * help
     Skriv ut usage.
 * Svartlista vissa datum. Om fikadatum finns med i blacklist ska inget mail skickas ut
   det innebär också att ingen rotation sker, och fikas flyttas effektivt till nästa vecka.
   * blacklist add 2016-10-15
     Svartlistar ett visst datum.
   * blacklist remove 2016-10-15
     Vitlistar ett visst datum igen.
   * blacklist list
     Listar svartlistade datum.
 * 
