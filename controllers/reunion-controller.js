const Reunion = require('../models/reunion');
const ReunionProprietaire = require('../models/reunion-proprietaire');
const Proprietaire = require('../models/proprietaire');
const Notification = require('../models/notification');
const { sendReunionInvitationEmail } = require('../services/email-service');

exports.createReunion = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can create reunions'
      });
    }

    const {
      title,
      description,
      date,
      startTime,
      endTime,
      location
    } = req.body;

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, date, start time, and end time are required'
      });
    }

    const reunionData = {
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      createdBy: req.userId
    };

    const reunion = await Reunion.create(reunionData);

    return res.status(201).json({
      success: true,
      message: 'Reunion created successfully',
      reunion: reunion.toJSON()
    });
  } catch (error) {
    console.error('Error creating reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating reunion'
    });
  }
};

exports.getAllReunions = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all reunions'
      });
    }

    const reunions = await Reunion.findAll();


    return res.status(200).json({
      success: true,
      count: reunions.length,
      reunions: reunions.map(r => r.toJSON())
    });
  } catch (error) {
    console.error('Error getting reunions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting reunions'
    });
  }
};


exports.getMyReunions = async (req, res) => {
  try {

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view their reunions'
      });
    }


    const reunions = await Reunion.findBySyndicId(req.userId);


    return res.status(200).json({
      success: true,
      count: reunions.length,
      reunions: reunions.map(r => r.toJSON())
    });
  } catch (error) {
    console.error('Error getting syndic reunions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting syndic reunions'
    });
  }
};


exports.getMyProprietaireReunions = async (req, res) => {
  try {

    if (req.userRole !== 'proprietaire') {
      return res.status(403).json({
        success: false,
        message: 'Only proprietaires can view their reunions'
      });
    }


    const reunionsWithDetails = await ReunionProprietaire.getReunionsForProprietaireWithDetails(req.userId);

    return res.status(200).json({
      success: true,
      count: reunionsWithDetails.length,
      reunions: reunionsWithDetails
    });
  } catch (error) {
    console.error('Error getting proprietaire reunions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting proprietaire reunions'
    });
  }
};


exports.getReunionById = async (req, res) => {
  try {
    const { id } = req.params;


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }

    if (req.userRole === 'proprietaire') {
      const relationship = await ReunionProprietaire.findByReunionAndProprietaire(id, req.userId);

      if (!relationship) {
        return res.status(403).json({
          success: false,
          message: 'You are not invited to this reunion'
        });
      }
    }

    else if (req.userRole === 'syndic' && reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this reunion'
      });
    }


    return res.status(200).json({
      success: true,
      reunion: reunion.toJSON()
    });
  } catch (error) {
    console.error('Error getting reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting reunion'
    });
  }
};


exports.updateReunion = async (req, res) => {
  try {
    const { id } = req.params;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can update reunions'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update reunions you created'
      });
    }


    const updatedReunion = await reunion.update(req.body);


    return res.status(200).json({
      success: true,
      message: 'Reunion updated successfully',
      reunion: updatedReunion.toJSON()
    });
  } catch (error) {
    console.error('Error updating reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating reunion'
    });
  }
};


exports.deleteReunion = async (req, res) => {
  try {
    const { id } = req.params;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can delete reunions'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete reunions you created'
      });
    }


    await reunion.delete();


    return res.status(200).json({
      success: true,
      message: 'Reunion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting reunion'
    });
  }
};


exports.cancelReunion = async (req, res) => {
  try {
    const { id } = req.params;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can cancel reunions'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel reunions you created'
      });
    }


    await reunion.cancel();

    return res.status(200).json({
      success: true,
      message: 'Reunion cancelled successfully',
      reunion: reunion.toJSON()
    });
  } catch (error) {
    console.error('Error cancelling reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling reunion'
    });
  }
};


exports.completeReunion = async (req, res) => {
  try {
    const { id } = req.params;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can complete reunions'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }

    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete reunions you created'
      });
    }


    await reunion.complete();


    return res.status(200).json({
      success: true,
      message: 'Reunion marked as completed',
      reunion: reunion.toJSON()
    });
  } catch (error) {
    console.error('Error completing reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error completing reunion'
    });
  }
};


exports.inviteProprietaires = async (req, res) => {
  try {
    const { id } = req.params;
    const { proprietaireIds } = req.body;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can invite proprietaires to reunions'
      });
    }


    if (!proprietaireIds || !Array.isArray(proprietaireIds) || proprietaireIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of proprietaire IDs'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only invite proprietaires to reunions you created'
      });
    }


    const invitationResults = [];
    const failedInvitations = [];

    for (const proprietaireId of proprietaireIds) {
      try {

        const proprietaire = await Proprietaire.findById(proprietaireId);

        if (!proprietaire) {
          failedInvitations.push({
            proprietaireId,
            error: 'Proprietaire not found'
          });
          continue;
        }

        const existingInvitation = await ReunionProprietaire.findByReunionAndProprietaire(id, proprietaireId);

        if (existingInvitation) {
          failedInvitations.push({
            proprietaireId,
            error: 'Proprietaire already invited'
          });
          continue;
        }


        const invitation = await ReunionProprietaire.create({
          reunionId: id,
          proprietaireId,
          status: 'invited',
          notificationSent: false
        });


        await Notification.createReunionInvitation(proprietaireId, reunion);


        try {
          await sendReunionInvitationEmail(proprietaire, reunion);
          await invitation.markNotificationSent();
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);

        }

        invitationResults.push({
          proprietaireId,
          status: 'invited',
          invitationId: invitation.id
        });
      } catch (inviteError) {
        console.error(`Error inviting proprietaire ${proprietaireId}:`, inviteError);
        failedInvitations.push({
          proprietaireId,
          error: inviteError.message
        });
      }
    }

    // Return results
    return res.status(200).json({
      success: true,
      message: 'Proprietaires invited to reunion',
      invitationResults,
      failedInvitations,
      reunion: reunion.toJSON()
    });
  } catch (error) {
    console.error('Error inviting proprietaires to reunion:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error inviting proprietaires to reunion'
    });
  }
};


exports.getInvitedProprietaires = async (req, res) => {
  try {
    const { id } = req.params;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view invited proprietaires'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view invited proprietaires for reunions you created'
      });
    }


    const invitedProprietaires = await ReunionProprietaire.getInvitedProprietairesWithDetails(id);


    return res.status(200).json({
      success: true,
      count: invitedProprietaires.length,
      invitedProprietaires
    });
  } catch (error) {
    console.error('Error getting invited proprietaires:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting invited proprietaires'
    });
  }
};


exports.updateAttendance = async (req, res) => {
  try {
    const { id, proprietaireId } = req.params;
    const { attendance } = req.body;


    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can update attendance'
      });
    }


    if (!attendance || !['present', 'absent'].includes(attendance)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid attendance status (present or absent)'
      });
    }


    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    if (reunion.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update attendance for reunions you created'
      });
    }


    const invitation = await ReunionProprietaire.findByReunionAndProprietaire(id, proprietaireId);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not invited to this reunion'
      });
    }


    await invitation.updateAttendance(attendance);


    return res.status(200).json({
      success: true,
      message: `Proprietaire marked as ${attendance}`,
      invitation: invitation.toJSON()
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating attendance'
    });
  }
};


exports.updateInvitationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;


    if (req.userRole !== 'proprietaire') {
      return res.status(403).json({
        success: false,
        message: 'Only proprietaires can update their invitation status'
      });
    }


    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status (accepted or declined)'
      });
    }

    const reunion = await Reunion.findById(id);

    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }


    const invitation = await ReunionProprietaire.findByReunionAndProprietaire(id, req.userId);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'You are not invited to this reunion'
      });
    }


    await invitation.updateStatus(status);


    return res.status(200).json({
      success: true,
      message: `Invitation ${status}`,
      invitation: invitation.toJSON()
    });
  } catch (error) {
    console.error('Error updating invitation status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating invitation status'
    });
  }
};

/**
 * Get all invitations for a reunion
 * This endpoint is accessible to both syndics and proprietaires
 */
exports.getAllInvitationsByReunionId = async (req, res) => {
  try {
    const { id } = req.params;

    // First, check if the reunion exists
    const reunion = await Reunion.findById(id);
    if (!reunion) {
      return res.status(404).json({
        success: false,
        message: 'Reunion not found'
      });
    }

    // Check permissions
    if (req.userRole === 'syndic') {
      // Syndics can only view invitations for reunions they created
      if (reunion.createdBy !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view invitations for reunions you created'
        });
      }
    } else if (req.userRole === 'proprietaire') {
      // Proprietaires can only view invitations if they are invited to the reunion
      const isInvited = await ReunionProprietaire.findByReunionAndProprietaire(id, req.userId);
      if (!isInvited) {
        return res.status(403).json({
          success: false,
          message: 'You are not invited to this reunion'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Get all invitations with proprietaire details
    const invitations = await ReunionProprietaire.getInvitedProprietairesWithDetails(id);

    return res.status(200).json({
      success: true,
      count: invitations.length,
      reunionId: id,
      reunionTitle: reunion.title,
      reunionDate: reunion.date,
      invitations: invitations
    });
  } catch (error) {
    console.error('Error getting invitations by reunion ID:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting invitations'
    });
  }
};
