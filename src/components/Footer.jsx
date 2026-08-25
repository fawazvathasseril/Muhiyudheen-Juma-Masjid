import { siteConfig } from "../config/siteConfig";

function Footer() {
  return (
    <footer className="footer">
      <div className="container">

        <div>
          <h3>
  {siteConfig.name}
</h3>
          <p>
            A place of worship, knowledge, and community.
          </p>
        </div>

        <div>
<p>
  © {new Date().getFullYear()} {siteConfig.name}
</p>
          <p>All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;