import React from 'react';
import { splitLeadershipParagraphs } from '../../lib/leadership';

const LeadershipMessageBody = ({ message, paragraphClassName = '' }) => (
  <>
    {splitLeadershipParagraphs(message).map((paragraph) => (
      <p key={paragraph} className={paragraphClassName}>
        {paragraph.split('\n').map((line, index, lines) => (
          <React.Fragment key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    ))}
  </>
);

export default LeadershipMessageBody;
